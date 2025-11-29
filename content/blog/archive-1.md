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

![serial_deserial.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fserial_deserial.png?alt=media&token=4b94676c-4c68-4c3c-93b9-607297479feb)

<div align="center">

_Serialize and Deserialize methods with base64 encoding_

</div>
<br><br>

![login_home.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Flogin_home.png?alt=media&token=e346c204-a518-41b5-8586-09910bd59d9d)

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

![gadget_chain.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fgadget_chain.png?alt=media&token=f77ceebd-f61d-4ad0-a264-19baa3c2b483)

<div align="center">

_CommonsCollections5 Gadget-Chain_

</div>
<br></br>

![code_gen_payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fcode_gen_payload.png?alt=media&token=972bcadd-64a0-4b55-bf2e-d5d2d0819878)

<div align="center">

_Code that generates the payload_

</div>

---

### #1 Command Input

![command.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fcommand.png?alt=media&token=804d4b5e-e938-48ea-b315-d31f993fd7dd)

The `execArgs` object is created with the String type with the value being the `command` provided by the user, depending on the command the payload creator wants to execute.

![debug command](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_command.png?alt=media&token=fb3eae0e-8ee3-4923-8e5c-2bb726aa2822)

---

### #2 Initializing the Transformer

![fake_transform.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Ffake_transform.png?alt=media&token=5c1bfa19-6cf5-46d9-8fe9-4e0db2fba93c)
`Transformer` is an interface with the method `transform(Object input)`, which takes an input value and returns a different value. Here the `transformerChain` object is initialized as a `ChainedTransformer` which is a subclass of Transformer, containing a `ConstantTransformer(1)`. `ChainedTransformer` is a special Transformer that takes a list of `Transformer[]` and calls each Transformer sequentially.

Initially, we only initialize `ConstantTransformer(1)` because it only returns 1, making it harmless and avoiding premature payload execution. We'll replace it with the actual payload later.

![debug_fake_chain.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_fake_chain.png?alt=media&token=4d4aee34-3553-42fe-aea3-157d521c6de3)

---

### #3 The Real Transformer Chain

![real_transformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Freal_transformer.png?alt=media&token=d17dbdf5-5876-45d3-b9c3-ab49c6bd6878)
The `transformers` object is initialized as an array of Transformer[] with 5 component Transformers, in sequence:

```java
new ConstantTransformer(Runtime.class)
```

`ConstantTransformer` is a Transformer that returns a specific value, in this case it returns `Runtime.class`

![debug_runtimeclass.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_runtimeclass.png?alt=media&token=077fb0a6-3bf7-43be-9bc6-67e20f1b7a61)

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

![debug_getruntime.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_getruntime.png?alt=media&token=0d5ff31e-ac7b-4f9b-97c0-bb65aa42b423)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("invoke", new Class[] {
            Object.class, Object[].class },
            new Object[] {
                null, new Object[0] })
```

The function and structure are still the same as the `InvokerTransformer` above. This time, it has the task of executing `Runtime.getRuntime()` to get the `Runtime` object.

![debug_invoke.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_invoke.png?alt=media&token=9e703cd1-5b70-41ab-b113-0d142037b7af)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("exec", new Class[] { String.class }, execArgs)
```

With the final `InvokerTransformer`, it calls the `exec()` method of the `Runtime` object (`Runtime().getRuntime().exec(command)` or `Runtime().exec(command)`) to execute the provided command.

![debug_exec.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_exec.png?alt=media&token=ea0b729d-aec2-4d15-9c9b-351cc5d9b803)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new ConstantTransformer(1)
```

The final _ConstantTransformer_ returns **1** to finish and avoid errors.

![debug_endconst.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_endconst.png?alt=media&token=c8d2d247-1223-4dfa-babc-b930ad707380)

---

### #4. Creating LazyMap and TiedMapEntry

![lazymap_tiedmap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Flazymap_tiedmap.png?alt=media&token=97e0545e-1d60-4ce7-9fe9-d24a124a813d)

```java
final Map innerMap = new HashMap();
final Map lazyMap = LazyMap.decorate(innerMap, transformerChain);
```

In the _Apache Commons Collections_ library, `LazyMap` is a class that acts like a regular `Map` but can automatically generate values when a key doesn't exist. When accessing a key that doesn't exist in `LazyMap`, it will call the `Transformer` to create a new value.

The `innerMap` object is a regular `HashMap`, initially empty and without any special mechanisms. The `LazyMap.decorate(innerMap, transformerChain)` method wraps `innerMap` into a `LazyMap`. The resulting `lazyMap` object is a LazyMap where:

- The actual data is still stored in `innerMap`.
- `transformerChain` acts as a factory: When a key doesn't exist in innerMap, instead of returning null, LazyMap will call `transformerChain.transform(key)` to create the corresponding value. Initially, `transformerChain` is just a fake chain, returning only `1`, but it will be replaced with the real chain later.

![debug_lazymap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_lazymap.png?alt=media&token=a1cca5a7-420b-498f-a7d4-e8dbd7f80dad)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
TiedMapEntry entry = new TiedMapEntry(lazyMap, "foo");
```

`TiedMapEntry` is also a class in `Apache Commons Collections`, designed to link a Map with a specific key. The `entry` object created is a `TiedMapEntry` that connects `lazyMap` with the key `"foo"`. When `entry.toString()` is called, it will call `lazyMap.get()` because the key "foo" doesn't exist yet, and `transformerChain.transform()` will be called, triggering the gadget-chain.

![debug_tiedmap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_tiedmap.png?alt=media&token=022e0cf0-b179-41ef-a95f-223aa8b6bb25)

---

### #5. Assigning to `BadAttributeValueExpException` for Automatic Triggering

![BadAttribute.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2FBadAttribute.png?alt=media&token=eaf14394-79db-4262-98dc-7af2822a13f5)

```java
BadAttributeValueExpException val = new BadAttributeValueExpException(null);
```

`BadAttributeValueExpException` is a class in Java, used when there's an error in the value of an attribute. `val` is an object of this class. Here, when initializing the `val` object, we pass `null` because this value will be changed later to override the `toString()` method, causing the `toString()` of `TiedMapEntry` to be triggered.

![debug_val.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_val.png?alt=media&token=da243e0d-393f-420f-aacf-3b61f51620e6)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
Field valfield = val.getClass().getDeclaredField("val");
```

The `valfield` object belongs to the `Field` class. The `getClass()` method returns a Class object representing the class of `val` (BadAttributeValueExpException). The `getDeclaredField(String fieldName)` method is a method of the `Class` class, helping to get information about a specific field in the class. It returns a Field object containing information about the "val" field, whether it's private, protected, or public.

![debug_valfield.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_valfield.png?alt=media&token=3a3e3fb3-a360-4a35-8f8c-d67dd433cdbb)

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

![debug_setAccess.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_setAccess.png?alt=media&token=46e8686d-c30f-4949-94d4-cfd68ee8f563)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
valfield.set(val, entry);
```

The `set(Object obj, Object value)` method of the `Field` class sets the value of the `val` field in the `val` object to `entry`. `entry` was previously assigned as a `TiedMapEntry`.

![debug_setField.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_setField.png?alt=media&token=4d626cc7-389e-4cc4-b28e-417eca2b7e8d)

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

![debug_replace.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug_replace.png?alt=media&token=c978cfa8-e462-4d74-8ac2-6c1ed52f387a)

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

![payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fpayload.png?alt=media&token=87a59e7b-94a8-4e00-8dbf-7b476826bc1b)

In the web application demonstrating the deserialization vulnerability, user data is serialized then base64 encoded before being stored in a cookie, so when creating the payload, it also needs to be base64 encoded to be inserted into the cookie, as the payload will be base64 decoded then deserialized.

## **5.3. Notes on Runtime.exec()**

In the process of creating and exploiting payloads, the `Runtime.getRuntime().exec(command)` command is used to execute system commands. But if you just pass a command as you would on a normal shell to create the payload, it won't work as expected when deserialized.

In the article "sh – Or: Getting a shell environment from Runtime.exec", author Markus Wulftange discusses using the Runtime.exec method in Java on Unix systems. He points out that when using Runtime.exec, commands are not executed in an actual shell, leading to features like pipes, redirections, quoting, or expansions not working as expected.

To overcome this, the author suggests using the command `sh -c $@|sh . echo [command]` to create a full shell environment, allowing the execution of complex commands with all shell features. This method takes advantage of sh's ability to pass commands through standard input, helping to overcome the limitations of Runtime.exec.

However, when using this method, it's important to note that important spaces in the command must be properly encoded, as Java's StringTokenizer will separate the command string at any whitespace character.

Article link: https://codewhitesec.blogspot.com/2015/03/sh-or-getting-shell-environment-from.html

Tool to help create runtime.exec payloads faster: https://ares-x.com/tools/runtime-exec/

![tool_runtime.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Ftool_runtime.png?alt=media&token=8904f8b1-c87e-4506-8e05-147ace04957b)

---

# **6. Debugging a Website with Insecure Deserialization Leading to RCE**

In the process of debugging the demo website, we use IntelliJ IDEA to leverage convenient debugging features.

## **6.1. Determining Breakpoints**

To debug effectively, breakpoints are set at key points in the application and the `CommonsCollections5` gadget-chain to monitor the execution flow from cookie deserialization to RCE.

- **/login Endpoint**: Set a breakpoint to see the username value during login, observe it being serialized and added to the `user_session` cookie.
  ![endpoint_login.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fendpoint_login.png?alt=media&token=bd513ea4-74b5-4149-af19-3bb9287ee59c)

- **/home Endpoint**: Breakpoint at the cookie processing step before deserialization, confirming the input data.
  ![endpoint_home.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fendpoint_home.png?alt=media&token=615a83a0-001c-4d96-b377-01f13d65710a)

- **Deserialize cookie**: Breakpoint at the step of deserializing the user_session cookie to see the payload being passed in.
  ![deserialize.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdeserialize.png?alt=media&token=6ecb3b2f-8c1a-4876-a6ca-c5d4a234c969)

- `CommonsCollections5` Gadget-chain: Breakpoints in the main classes:

  - `BadAttributeValueExpException.readObject()`:
    ![badattribute2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fbadattribute2.png?alt=media&token=dc489047-f76a-426b-80e0-da1cd7566383)

  - `TiedMapEntry.toString()`,`TiedMapEntry.getKey()` and `TiedMapEntry.getValue()`: Monitor LazyMap activation.
    ![TiedMapEntry_toString.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2FTiedMapEntry_toString.png?alt=media&token=f4f0a9b5-5f2a-4e19-9a90-a5071c5d2063)
    ![TiedMapEntry_getValue.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2FTiedMapEntry_getValue.png?alt=media&token=feff16b4-a70b-4794-97ff-3fce6f6b0846)

  - `LazyMap.get()`: Preparing to activate ChainedTransformer
    ![lazymap_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Flazymap_get.png?alt=media&token=cf6a1c2e-1484-4b6f-961f-dedd5a10a7b0)
  - `ChainedTransformer.transform()`: Analyze each transformer step.
    ![ChainedTransformer.tranform()](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fchainedtransformer_transform.png?alt=media&token=9dbef5fd-9ac8-4ccc-a3a7-1a48bd45b0dc)
  - `ConstantTransformer.transform()`:
    ![constanttransformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fconstanttransformer.png?alt=media&token=a5210d98-97c4-4b95-83b2-f7a9e46afb65)
  - `InvokerTransformer.transform()`: View the system command being executed.
    ![invokertransformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Finvokertransformer.png?alt=media&token=47dc5dc8-16fc-459d-86f1-1deca9d78631)

## **6.2. Detailed Debugging of the Execution Flow**

When accessing the website, the login page appears first:
![login_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Flogin_page.png?alt=media&token=00be2f32-3087-4baf-926b-a55e182d2798)
We'll register before logging in, registration page:
![register_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fregister_page.png?alt=media&token=2b84025f-e3db-4eb9-8006-ae44fb4b93f9)
When sign up is successful, the website reports "Registration Successfully":
![register_success.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fregister_success.png?alt=media&token=07d4766d-75db-4333-9323-c4289a8bab77)
After successful login, we'll be redirected to the Home Page:
![home_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fhome_page.png?alt=media&token=488a541c-bf04-4165-9672-5ad8a55e89a9)
On the Home Page, we see a line saying "Hello test!" with `test` being the username we just registered and used to log in. In `AuthController`, the `username` when logging in will be serialized then base64 encoded and stored in a cookie named `user_session`:
![debug2_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_cookie.png?alt=media&token=a3d75ea4-6e74-4194-b145-1d4b68752d09)

After the `username` is successfully serialized, base64 encoded and added to the cookie, the `/auth/home` endpoint will be called and the process of deserializing the cookie will take place to read the username that was previously serialized and base64 encoded, then display "Hello [username]":
![debug2_deserialize_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_deserialize_cookie.png?alt=media&token=2e9f1c6b-27da-4d4f-aea2-cea92ab7ec85)

![debug2_deserialize_cookie2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_deserialize_cookie2.png?alt=media&token=40ce235b-bd38-412c-b6c1-f50ad7819288)

We can also check the cookie in the browser:
![cookie_browser.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fcookie_browser.png?alt=media&token=03b4179a-c187-4641-a2f4-34069a790a38)
Now we can change the cookie value with the payload created in [section 5](#5-creating-payloads-with-ysoserial):
![cookie_payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fcookie_payload.png?alt=media&token=1cea27cc-400b-462a-9f7a-77205bfaf754)
When reloading, the `/home` endpoint is called again, the cookie containing the payload will go into the `deserializeFromBase64` method to decode base64 and deserialize:
![debug2_payloadintodeserialize.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_payloadintodeserialize.png?alt=media&token=1d153c3d-e30d-49e8-a15c-110c117371f5)
![debug2_payloadintodeserializefunc.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_payloadintodeserializefunc.png?alt=media&token=61052588-6cb8-4ff8-b5dc-573fe9e65a9e)

When the payload goes into `.readObject()` in the `deserializeFromBase64` method, it is the object that was pre-created to execute the gadget-chain, which will override the `readObject()` method in the `BadAttributeValueExpException` class:
![debug2_readobject_badattr.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_readobject_badattr.png?alt=media&token=0b2023dc-621e-46d1-8a2e-7ccbacd47fde)

The `valObj` object, taken from `gf.get("val", null)` in `readObject` of `BadAttributeValueExpException`, is the value of the `val` field from the deserialized data. With the payload from ysoserial, `valObj` is a `TiedMapEntry`, it activates `toString()` in the final branch:
![debug2_valObj_toString.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_valObj_toString.png?alt=media&token=6e35a349-32ce-458f-9b3b-72b9c62d7e3c)

And `valObj` is a `TiedMapEntry`, when `toString()` is called on `valObj`, the `toString()` method of `TiedMapEntry` will be activated:
![debug2_tiedmapentry_tostring.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_tiedmapentry_tostring.png?alt=media&token=f56c734b-8fd2-4580-9e41-801477903d14)

The `TiedMapEntry.toString()` method successively calls `getKey()` (returns "foo") and `getValue()`, `getValue()` returns `map.get(key)`, which is `map.get("foo")`:
![debug2_tiedmapentry_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_tiedmapentry_get.png?alt=media&token=f90ccfee-c1eb-4534-9c4c-b53ac2fc6781)

Because map is a `LazyMap`, `LazyMap.get("foo")` is activated:
![debug2_lazymap_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_lazymap_get.png?alt=media&token=8145f067-be04-425f-b0a5-656bb087a381)

Here, the code checks whether the key `"foo"` exists, and because the map here is an empty `HashMap`, which is the `innerMap` object mentioned above, the key doesn't exist, so it activates `factory.transform(key)` with factory being a `ChainedTransformer` (the `transformers` object in ysoserial) leading to the activation of `ChainedTransformer.transform()`:
![debug2_chainedtransformer_transform.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_transform.png?alt=media&token=cb4db11a-6797-4a4e-8133-edaeb295a43b)

`iTransformers[]` in `ChainedTransformer` is an array containing `Transformer` interfaces. These objects are typically concrete classes like `ConstantTransformer` or `InvokerTransformer`, used to perform a series of transformations on the input data.

`iTransformer[]` in this gadget-chain is set for values sequentially from 0 - 4 as shown in the image above. The for loop in the `ChainedTransformer.transform()` method iterates through the `iTransformers` array, successively calling the `transform()` method of each element. The initial input value is passed to the first Transformer, then the result of each call is used as input for the next Transformer.

The Transformer chain proceeds as follows:

- `i = 0`, `object = "foo"`:

  The first Transformer is a `ConstantTransformer`, the value passed in (object) is `"foo"`.
  ![debug2_chainedtransformer_loop_0.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_0.png?alt=media&token=74568ff7-4257-43ea-ab56-65924996263e)

  The `transform` method of the `ConstantTransformer` class only receives input without processing it, just returning the `iConstant` that was set up when creating the payload.
  ![debug2_chainedtransformer_loop_0_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_0_1.png?alt=media&token=32fc4029-1b87-4c53-ac7e-27f81d1f70ba)
  When the first loop ends, `object` is `java.lang.Runtime` or `Runtime.class`.

<br>

The next 3 Transformers are `InvokerTransformer`. `InvokerTransformer` is a class in the Apache Commons Collections library that implements the `Transformer` interface. Its main function is to call a `method` on an `object` using the `Java Reflection API`.

The `Java Reflection API` is a collection of `classes` and `interfaces` in the `java.lang.reflect` package, allowing programs to inspect and manipulate `classes`, `methods`, `fields`, `constructors` at `runtime`, even when detailed information about them is not known in advance.

Here, the `Java Reflection API` is used to indirectly call a method. This API allows calling a method of any class. An example of invoke can get a method from another class:
![debug2_chainedtransformer_loop_1_6.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_6.png?alt=media&token=75dd7cb3-7227-43a9-b951-45f9cf0fc5b4)

With the conventional way:

![debug2_chainedtransformer_loop_1_7.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_7.png?alt=media&token=52a64206-2aed-48f3-8f69-b70048ff3cf2)

Using Reflection:
![debug2_chainedtransformer_loop_1_8.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_8.png?alt=media&token=2e4952e5-0f10-4726-aa18-9d37b835d738)
That is, `method.invoke(obj, param)` is equivalent to `obj.method(param)`

- `i = 1`, `object = Runtime.class`:
  ![debug2_chainedtransformer_loop_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1.png?alt=media&token=a291513f-9f33-4f84-a93c-78c13a00b006)

  The `transform` method in `InvokerTransformer`:
  ![debug2_chainedtransformer_loop_1_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_1.png?alt=media&token=11a63145-1c4e-462f-82e6-0295ccaf2f61)

  Going into the analysis, the initial `input` is `object` (Runtime.class). The first if condition is not satisfied, so the program falls into the try block:
  ![debug2_chainedtransformer_loop_1_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_2.png?alt=media&token=b82dee14-ca3d-4491-9223-9c8720d69df4)

  - `Class cls = input.getClass()`:

    The `getClass()` method helps get the class of the object, here `input` is `Runtime.class` so `cls` will be class `Class` or `Class.class`:
    ![debug2_chainedtransformer_loop_1_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_3.png?alt=media&token=2ef6f3c7-3aad-4291-a6e2-d5306f932f96)

  - `Method method = cls.getMethod(iMethodName, iParamType)`:

    The `getMethod()` method gets a method on a class.

    `cls` has the value `Class.class`.

    `iMethodName` is `"getMethod"`.

    `iParamType` is `Class[] { String.class, Class[].class }`.
    ![debug2_chainedtransformer_loop_1_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_4.png?alt=media&token=71cb19f9-1979-4eb6-8474-f0ce17a6570b)

    It follows that `Method method = Class.class.getMethod("getMethod", Class[] { String.class, Class[].class })`, so `getMethod` will return the `getMethod` method of the `Class` class => `method` is `Class.getMethod`.
    ![debug2_chainedtransformer_loop_1_9.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_9.png?alt=media&token=db0a2740-19eb-4552-9b42-5423ab4fc7fd)

  - `return method.invoke(input, iArgs)`:

    `method` is `Class.getMethod`.

    `input` is `Runtime.class`.

    `iArgs` is `Object[] {"getRuntime", new Class[0] }`.
    ![debug2_chainedtransformer_loop_1_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_1_5.png?alt=media&token=6f668682-8482-4a02-a32c-5c0a00a3eab8)

    With the final code using reflection, it can be understood as `Runtime.class.getMethod("getRuntime")`, the result returned is an object of type `Method` => `object` is the `getRuntime` method of the `Runtime` class.

<br>

- `i = 2`, `object` is `Method getRuntime()`:

  ![debug2_chainedtransformer_loop_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_2.png?alt=media&token=2f5b5d5a-38eb-4bac-a50d-f635ef2487ee)
  ![debug2_chainedtransformer_loop_2_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_2_1.png?alt=media&token=34326e0f-9142-4807-b942-525c71470c9e)

  - `Class cls = input.getClass()`:

    `input` is the `getRuntime` method, and `getRuntime` is an instance of the `Method` class, so `getClass()` will return the class `Method` => `cls` is the class `Method`:
    ![debug2_chainedtransformer_loop_2_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_2_2.png?alt=media&token=2144774c-2725-4fa2-9eb3-28c3eef60b59)

  - `Method method = cls.getMethod(iMethodName, iParamTypes)`:

    `cls` is `Method.class`.

    `iMethodName` is `invoke`.

    `iParamTypes` is `Class[] { Object.class, Object[].class }`.
    ![debug2_chainedtransformer_loop_2_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_2_3.png?alt=media&token=608cfc7b-b203-4a79-aa9e-331e750aa343)
    It is equivalent to `Method.class.getMethod("invoke", Class[] { Object.class, Object[].class })`, will return the `invoke` method of the `Method` class => `method` is `Method.invoke()`
    ![debug2_chainedtransformer_loop_2_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_2_4.png?alt=media&token=e13057bd-b3a7-4cf2-b6b7-92614f5bec7d)

  - `return method.invoke(input, iArgs)`:

    `method` is `Method.invoke()`.

    `input` is `Method getRuntime()`.

    `iArgs` is `Object[] { null, new Object[0] }`.
    ![debug2_chainedtransformer_loop_2_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_2_5.png?alt=media&token=2bbf5e75-eeeb-4f94-b8e0-911ab2346d34)

    At this step, `method` is `Method.invoke()`, so the code can be understood as `getRuntime.invoke(null, null)`, which is executing `Runtime.getRuntime()`. When executed, it will call `Runtime.getRuntime()` and return an instance of `Runtime`. Meanwhile, at step `i = 1`, `object` was only the `getRuntime` method, that is, an `instance` of `Method`, not actually executed.

<br>

- `i = 3`, `object = Runtime.getRuntime()`:

  ![debug2_chainedtransformer_loop_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_3.png?alt=media&token=bef28d74-10c1-4f5b-be01-2b3680354290)
  ![debug2_chainedtransformer_loop_3_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_3_1.png?alt=media&token=aec3a07b-f916-4236-bdc7-a3e0fe912f28)

  - `Class cls = input.getClass()`:

    `input` is `Runtime.getRuntime()`, so `getClass()` will get the class of this method => `cls` is `Runtime.class`.
    ![debug2_chainedtransformer_loop_3_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_3_2.png?alt=media&token=e95d5820-b508-4979-82b5-6ddcb018e201)

  - `Method method = cls.getMethod(iMethodName, iParamTypes)`:

    `cls` is `Runtime.class`.

    `iMethodName` is `"exec"`.

    `iParamTypes` is `Class[] { String.class }`.
    ![debug2_chainedtransformer_loop_3_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_3_3.png?alt=media&token=7ab3b813-9239-4dc5-ad26-67177b705f85)

    `getMethod()` will get the `exec` method of the `Runtime` class => `method` is `Runtime.exec()`.
    ![debug2_chainedtransformer_loop_3_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_3_4.png?alt=media&token=019b7d33-c5b9-4386-ba5f-efadd6c9be3b)

  - `return method.invoke(input, iArgs)`:

    `method` is `Runtime.exec()`.

    `input` is `Runtime.getRuntime()`.

    `iArgs` is `execArgs` which is the command we want to execute.
    ![debug2_chainedtransformer_loop_3_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_3_5.png?alt=media&token=ab19ca4d-17b7-470a-bb04-7142f34c7628)

    It will execute `Runtime.getRuntime().exec(execArgs)`
    ![debug2_chainedtransformer_loop_3_6.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_3_6.png?alt=media&token=d440d0e0-d5b9-484e-8085-f31b29d1bca4)

    and RCE
    ![debug2_chainedtransformer_loop_3_7.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_3_7.png?alt=media&token=69c8ebe3-a5e8-45c2-97b9-219c06d092a4)
    This time, it returns an instance of `Process` representing the process just created.

<br>

The final Transformer is a `ConstantTransformer`

- `i = 4`, `object` is an instance of `Process`(UNIXProcess):

  ![debug2_chainedtransformer_loop_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_4.png?alt=media&token=908f6cca-07aa-463e-bbbd-649f373154d7)

  `ConstantTransformer` returns a fixed value regardless of the input, so it returns 1 to end the Transformer chain, avoiding errors when no more actions are needed.
  ![debug2_chainedtransformer_loop_4_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_4_1.png?alt=media&token=3216bc84-45b1-43ac-824d-3378b7b0c4f4)

Next, when `i = 5`, the loop has gone through the entire `iTransformers` array, it returns `object` carrying the value of the last `Transformer` returned, which is `1`.
![debug2_chainedtransformer_loop_4_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_chainedtransformer_loop_4_2.png?alt=media&token=11620f93-4c18-4329-bc29-4232f357f969)

At this point, back to `LazyMap`, `value` carries the value returned at the end of the Transformer chain, which is `1`, the key `"foo"` is added to the map (the `innerMap` object from the payload - a HashMap) and returns `value` (1).
![debug2_lazymap_putkey.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fdebug2_lazymap_putkey.png?alt=media&token=1be51c7d-cea0-406a-8b3b-75268eb22680)

To TiedMapEntry, the 2 methods `getKey()` and `getValue` are done
![tiedmapentry_return.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Ftiedmapentry_return.png?alt=media&token=edf1a4d1-d8e7-48dc-a903-32a733aa6de2)
`getKey()` returns `"foo"`, `getValue()` returns `1` => `TiedMapEntry.toString()` returns `"foo=1"`

Next to `BadAttributeExpException`, now `val` will have the value `"foo=1"`
![val_value.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fval_value.png?alt=media&token=0c344f0a-a36d-4b7b-ad95-525d7142e04a)

And finally back to `AuthController`, it returns the object that has been deserialized
![authcontroller_return.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fauthcontroller_return.png?alt=media&token=9ff03105-723e-472f-a32b-47eed50d18b9)
and continues the application.
![web_running.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Fweb_running.png?alt=media&token=a22d7c14-cc21-4755-9db1-54392a90f5ac)

On the web page, "Invalid Cookie" appears, but we have successfully exploited it.
![invalid_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2Farchive-1%2Finvalid_cookie.png?alt=media&token=ebdad410-f715-4ba4-b118-1e3cdcef38d2)

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
