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

![serial_deserial.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fserial_deserial.png?alt=media&token=abf5aae1-92ad-432b-b349-2e10d05e96d6)

<div align="center">

_Serialize and Deserialize methods with base64 encoding_

</div>
<br><br>

![login_home.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Flogin_home.png?alt=media&token=a9bfe561-cbdf-402a-b123-aee4398387d2)

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

![gadget_chain.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fgadget_chain.png?alt=media&token=0ead47a3-c547-49d4-975c-012967e9de6c)

<div align="center">

_CommonsCollections5 Gadget-Chain_

</div>
<br></br>

![code_gen_payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fcode_gen_payload.png?alt=media&token=13099f76-f258-4742-983c-6cc3992264ee)

<div align="center">

_Code that generates the payload_

</div>

---

### #1 Command Input

![command.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fcommand.png?alt=media&token=28c4c3cb-6a35-411c-9adb-ab3025abfcc0)

The `execArgs` object is created with the String type with the value being the `command` provided by the user, depending on the command the payload creator wants to execute.

![debug command](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_command.png?alt=media&token=fcd78f41-f373-4919-9fda-1485861c65d1)

---

### #2 Initializing the Transformer

![fake_transform.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Ffake_transform.png?alt=media&token=b03b0527-7673-4031-bc5b-1f402ed82d31)
`Transformer` is an interface with the method `transform(Object input)`, which takes an input value and returns a different value. Here the `transformerChain` object is initialized as a `ChainedTransformer` which is a subclass of Transformer, containing a `ConstantTransformer(1)`. `ChainedTransformer` is a special Transformer that takes a list of `Transformer[]` and calls each Transformer sequentially.

Initially, we only initialize `ConstantTransformer(1)` because it only returns 1, making it harmless and avoiding premature payload execution. We'll replace it with the actual payload later.

![debug_fake_chain.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_fake_chain.png?alt=media&token=0bec19dc-0fff-4566-8d6d-a985c4a060f6)

---

### #3 The Real Transformer Chain

![real_transformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Freal_transformer.png?alt=media&token=3ae4c458-488b-4117-92f1-576bc17f78d9)
The `transformers` object is initialized as an array of Transformer[] with 5 component Transformers, in sequence:

```java
new ConstantTransformer(Runtime.class)
```

`ConstantTransformer` is a Transformer that returns a specific value, in this case it returns `Runtime.class`

![debug_runtimeclass.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_runtimeclass.png?alt=media&token=82d11ca5-d410-446c-954d-82881e85c35f)

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

![debug_getruntime.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_getruntime.png?alt=media&token=f6226a44-2663-47c2-803b-dbc3a764cfe6)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("invoke", new Class[] {
            Object.class, Object[].class },
            new Object[] {
                null, new Object[0] })
```

The function and structure are still the same as the `InvokerTransformer` above. This time, it has the task of executing `Runtime.getRuntime()` to get the `Runtime` object.

![debug_invoke.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_invoke.png?alt=media&token=89970991-214b-481e-941d-dd4e0a4d2ab7)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("exec", new Class[] { String.class }, execArgs)
```

With the final `InvokerTransformer`, it calls the `exec()` method of the `Runtime` object (`Runtime().getRuntime().exec(command)` or `Runtime().exec(command)`) to execute the provided command.

![debug_exec.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_exec.png?alt=media&token=1372702b-0ee4-4dfa-97aa-80bd2acbc0a5)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new ConstantTransformer(1)
```

The final _ConstantTransformer_ returns **1** to finish and avoid errors.

![debug_endconst.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_endconst.png?alt=media&token=73467a80-a6f4-4040-baf7-2cba28377f45)

---

### #4. Creating LazyMap and TiedMapEntry

![lazymap_tiedmap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Flazymap_tiedmap.png?alt=media&token=3bedd109-13b0-4607-88a9-c1bbcc1a3c59)

```java
final Map innerMap = new HashMap();
final Map lazyMap = LazyMap.decorate(innerMap, transformerChain);
```

In the _Apache Commons Collections_ library, `LazyMap` is a class that acts like a regular `Map` but can automatically generate values when a key doesn't exist. When accessing a key that doesn't exist in `LazyMap`, it will call the `Transformer` to create a new value.

The `innerMap` object is a regular `HashMap`, initially empty and without any special mechanisms. The `LazyMap.decorate(innerMap, transformerChain)` method wraps `innerMap` into a `LazyMap`. The resulting `lazyMap` object is a LazyMap where:

- The actual data is still stored in `innerMap`.
- `transformerChain` acts as a factory: When a key doesn't exist in innerMap, instead of returning null, LazyMap will call `transformerChain.transform(key)` to create the corresponding value. Initially, `transformerChain` is just a fake chain, returning only `1`, but it will be replaced with the real chain later.

![debug_lazymap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_lazymap.png?alt=media&token=38a30c08-69dc-4464-b96a-effcd6a2391e)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
TiedMapEntry entry = new TiedMapEntry(lazyMap, "foo");
```

`TiedMapEntry` is also a class in `Apache Commons Collections`, designed to link a Map with a specific key. The `entry` object created is a `TiedMapEntry` that connects `lazyMap` with the key `"foo"`. When `entry.toString()` is called, it will call `lazyMap.get()` because the key "foo" doesn't exist yet, and `transformerChain.transform()` will be called, triggering the gadget-chain.

![debug_tiedmap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_tiedmap.png?alt=media&token=4e749ba8-58e1-49bb-bd1b-b4fdcf931876)

---

### #5. Assigning to `BadAttributeValueExpException` for Automatic Triggering

![BadAttribute.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2FBadAttribute.png?alt=media&token=1169d7eb-1b14-42af-81c0-de6b46fd04cb)

```java
BadAttributeValueExpException val = new BadAttributeValueExpException(null);
```

`BadAttributeValueExpException` is a class in Java, used when there's an error in the value of an attribute. `val` is an object of this class. Here, when initializing the `val` object, we pass `null` because this value will be changed later to override the `toString()` method, causing the `toString()` of `TiedMapEntry` to be triggered.

![debug_val.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_val.png?alt=media&token=d1e90161-96ba-428c-abfa-69f30677fc9c)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
Field valfield = val.getClass().getDeclaredField("val");
```

The `valfield` object belongs to the `Field` class. The `getClass()` method returns a Class object representing the class of `val` (BadAttributeValueExpException). The `getDeclaredField(String fieldName)` method is a method of the `Class` class, helping to get information about a specific field in the class. It returns a Field object containing information about the "val" field, whether it's private, protected, or public.

![debug_valfield.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_valfield.png?alt=media&token=00fea70b-f5d5-436b-97d9-aecd765e2b6f)

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

![debug_setAccess.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_setAccess.png?alt=media&token=3c30554e-f254-4743-951d-e6de191bdafd)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
valfield.set(val, entry);
```

The `set(Object obj, Object value)` method of the `Field` class sets the value of the `val` field in the `val` object to `entry`. `entry` was previously assigned as a `TiedMapEntry`.

![debug_setField.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_setField.png?alt=media&token=7f0a4c30-0949-43b7-8192-b98d07190edf)

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

![debug_replace.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug_replace.png?alt=media&token=2414bf0a-cdcb-417e-af55-830562998ff3)

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

![payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fpayload.png?alt=media&token=248e7ba1-16f9-433d-91f8-cd32344685e7)

In the web application demonstrating the deserialization vulnerability, user data is serialized then base64 encoded before being stored in a cookie, so when creating the payload, it also needs to be base64 encoded to be inserted into the cookie, as the payload will be base64 decoded then deserialized.

## **5.3. Notes on Runtime.exec()**

In the process of creating and exploiting payloads, the `Runtime.getRuntime().exec(command)` command is used to execute system commands. But if you just pass a command as you would on a normal shell to create the payload, it won't work as expected when deserialized.

In the article "sh – Or: Getting a shell environment from Runtime.exec", author Markus Wulftange discusses using the Runtime.exec method in Java on Unix systems. He points out that when using Runtime.exec, commands are not executed in an actual shell, leading to features like pipes, redirections, quoting, or expansions not working as expected.

To overcome this, the author suggests using the command `sh -c $@|sh . echo [command]` to create a full shell environment, allowing the execution of complex commands with all shell features. This method takes advantage of sh's ability to pass commands through standard input, helping to overcome the limitations of Runtime.exec.

However, when using this method, it's important to note that important spaces in the command must be properly encoded, as Java's StringTokenizer will separate the command string at any whitespace character.

Article link: https://codewhitesec.blogspot.com/2015/03/sh-or-getting-shell-environment-from.html

Tool to help create runtime.exec payloads faster: https://ares-x.com/tools/runtime-exec/

![tool_runtime.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Ftool_runtime.png?alt=media&token=4fff1b08-cde2-4715-8cd6-bb65b61280b9)

---

# **6. Debugging a Website with Insecure Deserialization Leading to RCE**

In the process of debugging the demo website, we use IntelliJ IDEA to leverage convenient debugging features.

## **6.1. Determining Breakpoints**

To debug effectively, breakpoints are set at key points in the application and the `CommonsCollections5` gadget-chain to monitor the execution flow from cookie deserialization to RCE.

- **/login Endpoint**: Set a breakpoint to see the username value during login, observe it being serialized and added to the `user_session` cookie.
  ![endpoint_login.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fendpoint_login.png?alt=media&token=12adf91d-4d56-4766-a991-1d0cb1f5c699)

- **/home Endpoint**: Breakpoint at the cookie processing step before deserialization, confirming the input data.
  ![endpoint_home.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fendpoint_home.png?alt=media&token=7ceda679-aca1-4c9b-9e84-e17237e8395e)

- **Deserialize cookie**: Breakpoint at the step of deserializing the user_session cookie to see the payload being passed in.
  ![deserialize.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdeserialize.png?alt=media&token=67272695-e4e5-4384-bbe1-5fb547a28627)

- `CommonsCollections5` Gadget-chain: Breakpoints in the main classes:

  - `BadAttributeValueExpException.readObject()`:
    ![badattribute2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fbadattribute2.png?alt=media&token=38068b49-2459-4f88-9317-7f645e4c1288)

  - `TiedMapEntry.toString()`,`TiedMapEntry.getKey()` and `TiedMapEntry.getValue()`: Monitor LazyMap activation.
    ![TiedMapEntry_toString.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2FTiedMapEntry_toString.png?alt=media&token=3716b755-b6e3-45af-aef6-e7682b24a2cc)
    ![TiedMapEntry_getValue.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2FTiedMapEntry_getValue.png?alt=media&token=d5a5a7b0-d4be-464b-8f36-1a50e3fd5d2c)

  - `LazyMap.get()`: Preparing to activate ChainedTransformer
    ![lazymap_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Flazymap_get.png?alt=media&token=32ae22a9-1a51-4aa4-a47f-4aaf93d6acd2)
  - `ChainedTransformer.transform()`: Analyze each transformer step.
    ![ChainedTransformer.tranform()](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fchainedtransformer_transform.png?alt=media&token=8633a46e-2910-4ec1-baa1-2f2115e09aae)
  - `ConstantTransformer.transform()`:
    ![constanttransformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fconstanttransformer.png?alt=media&token=2f7ba2e0-bfa5-492a-b0b2-ed5489208ac0)
  - `InvokerTransformer.transform()`: View the system command being executed.
    ![invokertransformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Finvokertransformer.png?alt=media&token=d3fd83fc-58a5-4045-860d-9f561ec7140d)

## **6.2. Detailed Debugging of the Execution Flow**

When accessing the website, the login page appears first:
![login_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Flogin_page.png?alt=media&token=befaa7c4-f585-4446-a9fc-ed1791a717f2)
We'll register before logging in, registration page:
![register_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fregister_page.png?alt=media&token=3f2e3ef9-555e-45b5-b285-09b373b9385b)
When sign up is successful, the website reports "Registration Successfully":
![register_success.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fregister_success.png?alt=media&token=cacd3463-5ae6-488c-bdff-690e3bdabff3)
After successful login, we'll be redirected to the Home Page:
![home_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fhome_page.png?alt=media&token=5e973910-3aef-4ba0-9d3a-1bc03ac8bf67)
On the Home Page, we see a line saying "Hello test!" with `test` being the username we just registered and used to log in. In `AuthController`, the `username` when logging in will be serialized then base64 encoded and stored in a cookie named `user_session`:
![debug2_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_cookie.png?alt=media&token=ed80c8da-c259-4984-9fc2-93cf91c72c75)

After the `username` is successfully serialized, base64 encoded and added to the cookie, the `/auth/home` endpoint will be called and the process of deserializing the cookie will take place to read the username that was previously serialized and base64 encoded, then display "Hello [username]":
![debug2_deserialize_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_deserialize_cookie.png?alt=media&token=5521cba4-4415-437d-91cc-2cbbb131969f)

![debug2_deserialize_cookie2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_deserialize_cookie2.png?alt=media&token=12e52e6e-b8bc-4477-a10f-e99062b9c901)

We can also check the cookie in the browser:
![cookie_browser.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fcookie_browser.png?alt=media&token=f142f291-a2b8-4193-b9f0-e4bf747d4b22)
Now we can change the cookie value with the payload created in [section 5](#5-creating-payloads-with-ysoserial):
![cookie_payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fcookie_payload.png?alt=media&token=22de7777-fd14-4c9f-898d-061b4151d23d)
When reloading, the `/home` endpoint is called again, the cookie containing the payload will go into the `deserializeFromBase64` method to decode base64 and deserialize:
![debug2_payloadintodeserialize.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_payloadintodeserialize.png?alt=media&token=f48ce325-f797-4495-a24f-ffe9b8839d12)
![debug2_payloadintodeserializefunc.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_payloadintodeserializefunc.png?alt=media&token=865a7536-098f-4bb4-bdc6-31970c434be0)

When the payload goes into `.readObject()` in the `deserializeFromBase64` method, it is the object that was pre-created to execute the gadget-chain, which will override the `readObject()` method in the `BadAttributeValueExpException` class:
![debug2_readobject_badattr.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_readobject_badattr.png?alt=media&token=107fbb38-0985-433d-baad-4095644252ca)

The `valObj` object, taken from `gf.get("val", null)` in `readObject` of `BadAttributeValueExpException`, is the value of the `val` field from the deserialized data. With the payload from ysoserial, `valObj` is a `TiedMapEntry`, it activates `toString()` in the final branch:
![debug2_valObj_toString.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_valObj_toString.png?alt=media&token=765d8ff1-2f1a-4957-96eb-a354a14744cb)

And `valObj` is a `TiedMapEntry`, when `toString()` is called on `valObj`, the `toString()` method of `TiedMapEntry` will be activated:
![debug2_tiedmapentry_tostring.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_tiedmapentry_tostring.png?alt=media&token=7002a412-3f1c-4e3b-9327-fafa3ce58adc)

The `TiedMapEntry.toString()` method successively calls `getKey()` (returns "foo") and `getValue()`, `getValue()` returns `map.get(key)`, which is `map.get("foo")`:
![debug2_tiedmapentry_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_tiedmapentry_get.png?alt=media&token=45cfc23e-6c6a-41b8-9fc3-8ac08d963bb0)

Because map is a `LazyMap`, `LazyMap.get("foo")` is activated:
![debug2_lazymap_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_lazymap_get.png?alt=media&token=68740885-f94c-447c-8685-47581596b0ca)

Here, the code checks whether the key `"foo"` exists, and because the map here is an empty `HashMap`, which is the `innerMap` object mentioned above, the key doesn't exist, so it activates `factory.transform(key)` with factory being a `ChainedTransformer` (the `transformers` object in ysoserial) leading to the activation of `ChainedTransformer.transform()`:
![debug2_chainedtransformer_transform.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_transform.png?alt=media&token=d3b85da8-233b-40ca-b0a5-3fc0650e5de0)

`iTransformers[]` in `ChainedTransformer` is an array containing `Transformer` interfaces. These objects are typically concrete classes like `ConstantTransformer` or `InvokerTransformer`, used to perform a series of transformations on the input data.

`iTransformer[]` in this gadget-chain is set for values sequentially from 0 - 4 as shown in the image above. The for loop in the `ChainedTransformer.transform()` method iterates through the `iTransformers` array, successively calling the `transform()` method of each element. The initial input value is passed to the first Transformer, then the result of each call is used as input for the next Transformer.

The Transformer chain proceeds as follows:

- `i = 0`, `object = "foo"`:

  The first Transformer is a `ConstantTransformer`, the value passed in (object) is `"foo"`.
  ![debug2_chainedtransformer_loop_0.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_0.png?alt=media&token=e407a2f2-d492-481b-b182-09a46a294ba0)

  The `transform` method of the `ConstantTransformer` class only receives input without processing it, just returning the `iConstant` that was set up when creating the payload.
  ![debug2_chainedtransformer_loop_0_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_0_1.png?alt=media&token=f2c422e0-8004-49f5-b76e-b6c27d77eb05)
  When the first loop ends, `object` is `java.lang.Runtime` or `Runtime.class`.

<br>

The next 3 Transformers are `InvokerTransformer`. `InvokerTransformer` is a class in the Apache Commons Collections library that implements the `Transformer` interface. Its main function is to call a `method` on an `object` using the `Java Reflection API`.

The `Java Reflection API` is a collection of `classes` and `interfaces` in the `java.lang.reflect` package, allowing programs to inspect and manipulate `classes`, `methods`, `fields`, `constructors` at `runtime`, even when detailed information about them is not known in advance.

Here, the `Java Reflection API` is used to indirectly call a method. This API allows calling a method of any class. An example of invoke can get a method from another class:
![debug2_chainedtransformer_loop_1_6.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_6.png?alt=media&token=e01edd9a-83fb-473f-ac87-0f9163382f99)

With the conventional way:

![debug2_chainedtransformer_loop_1_7.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_7.png?alt=media&token=ed8726ee-a20f-47fc-a5a9-06f072229cff)

Using Reflection:
![debug2_chainedtransformer_loop_1_8.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_8.png?alt=media&token=c6912088-b848-4c0a-8887-e6d3af4f1530)
That is, `method.invoke(obj, param)` is equivalent to `obj.method(param)`

- `i = 1`, `object = Runtime.class`:
  ![debug2_chainedtransformer_loop_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1.png?alt=media&token=efff0ba3-f78a-47e6-8f53-7d0f984923d7)

  The `transform` method in `InvokerTransformer`:
  ![debug2_chainedtransformer_loop_1_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_1.png?alt=media&token=d12a7c8d-3d2a-4a96-89cb-1c4523c37f82)

  Going into the analysis, the initial `input` is `object` (Runtime.class). The first if condition is not satisfied, so the program falls into the try block:
  ![debug2_chainedtransformer_loop_1_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_2.png?alt=media&token=4b4f4d15-de0c-4e34-9a2b-abf317b4b33d)

  - `Class cls = input.getClass()`:

    The `getClass()` method helps get the class of the object, here `input` is `Runtime.class` so `cls` will be class `Class` or `Class.class`:
    ![debug2_chainedtransformer_loop_1_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_3.png?alt=media&token=7c1693fd-1ba0-4c9b-9d57-24c4bf690395)

  - `Method method = cls.getMethod(iMethodName, iParamType)`:

    The `getMethod()` method gets a method on a class.

    `cls` has the value `Class.class`.

    `iMethodName` is `"getMethod"`.

    `iParamType` is `Class[] { String.class, Class[].class }`.
    ![debug2_chainedtransformer_loop_1_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_4.png?alt=media&token=a57700b0-6562-4f04-8d14-27c93ba38bcd)

    It follows that `Method method = Class.class.getMethod("getMethod", Class[] { String.class, Class[].class })`, so `getMethod` will return the `getMethod` method of the `Class` class => `method` is `Class.getMethod`.
    ![debug2_chainedtransformer_loop_1_9.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_9.png?alt=media&token=83b4a47c-c9ba-462a-a8bf-11d8ab999a34)

  - `return method.invoke(input, iArgs)`:

    `method` is `Class.getMethod`.

    `input` is `Runtime.class`.

    `iArgs` is `Object[] {"getRuntime", new Class[0] }`.
    ![debug2_chainedtransformer_loop_1_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_1_5.png?alt=media&token=a5814474-2808-49e8-87d9-2d67434e32f4)

    With the final code using reflection, it can be understood as `Runtime.class.getMethod("getRuntime")`, the result returned is an object of type `Method` => `object` is the `getRuntime` method of the `Runtime` class.

<br>

- `i = 2`, `object` is `Method getRuntime()`:

  ![debug2_chainedtransformer_loop_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_2.png?alt=media&token=2bd8c9cf-c7f7-4c1e-839d-87eebba3f3b3)
  ![debug2_chainedtransformer_loop_2_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_2_1.png?alt=media&token=adaefce2-625b-49d1-a37d-498ff0b6c535)

  - `Class cls = input.getClass()`:

    `input` is the `getRuntime` method, and `getRuntime` is an instance of the `Method` class, so `getClass()` will return the class `Method` => `cls` is the class `Method`:
    ![debug2_chainedtransformer_loop_2_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_2_2.png?alt=media&token=6db4c425-0a01-4c7d-8efc-e7c83895ee21)

  - `Method method = cls.getMethod(iMethodName, iParamTypes)`:

    `cls` is `Method.class`.

    `iMethodName` is `invoke`.

    `iParamTypes` is `Class[] { Object.class, Object[].class }`.
    ![debug2_chainedtransformer_loop_2_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_2_3.png?alt=media&token=67ba0036-6333-4d84-8b0a-57d0238e8bfc)
    It is equivalent to `Method.class.getMethod("invoke", Class[] { Object.class, Object[].class })`, will return the `invoke` method of the `Method` class => `method` is `Method.invoke()`
    ![debug2_chainedtransformer_loop_2_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_2_4.png?alt=media&token=06f83423-ac97-4fdb-8014-b3afc7c797c2)

  - `return method.invoke(input, iArgs)`:

    `method` is `Method.invoke()`.

    `input` is `Method getRuntime()`.

    `iArgs` is `Object[] { null, new Object[0] }`.
    ![debug2_chainedtransformer_loop_2_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_2_5.png?alt=media&token=ffcfbeaf-86fb-4137-a26e-84af328effb9)

    At this step, `method` is `Method.invoke()`, so the code can be understood as `getRuntime.invoke(null, null)`, which is executing `Runtime.getRuntime()`. When executed, it will call `Runtime.getRuntime()` and return an instance of `Runtime`. Meanwhile, at step `i = 1`, `object` was only the `getRuntime` method, that is, an `instance` of `Method`, not actually executed.

<br>

- `i = 3`, `object = Runtime.getRuntime()`:

  ![debug2_chainedtransformer_loop_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_3.png?alt=media&token=8d3a2a5c-fbdd-42e0-9293-1decaa0c4f1c)
  ![debug2_chainedtransformer_loop_3_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_3_1.png?alt=media&token=2246e247-c34c-42f5-bc57-e8670d434529)

  - `Class cls = input.getClass()`:

    `input` is `Runtime.getRuntime()`, so `getClass()` will get the class of this method => `cls` is `Runtime.class`.
    ![debug2_chainedtransformer_loop_3_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_3_2.png?alt=media&token=1166c0f5-fe80-42a1-943a-ed5fd2bdc4a8)

  - `Method method = cls.getMethod(iMethodName, iParamTypes)`:

    `cls` is `Runtime.class`.

    `iMethodName` is `"exec"`.

    `iParamTypes` is `Class[] { String.class }`.
    ![debug2_chainedtransformer_loop_3_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_3_3.png?alt=media&token=6666272c-6f9c-4840-a75a-cf32e00c2efd)

    `getMethod()` will get the `exec` method of the `Runtime` class => `method` is `Runtime.exec()`.
    ![debug2_chainedtransformer_loop_3_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_3_4.png?alt=media&token=37831e1e-af46-4a69-a132-16a31b3d3831)

  - `return method.invoke(input, iArgs)`:

    `method` is `Runtime.exec()`.

    `input` is `Runtime.getRuntime()`.

    `iArgs` is `execArgs` which is the command we want to execute.
    ![debug2_chainedtransformer_loop_3_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_3_5.png?alt=media&token=aab2cb5e-40cc-40db-bd6e-2fc6bdfc5016)

    It will execute `Runtime.getRuntime().exec(execArgs)`
    ![debug2_chainedtransformer_loop_3_6.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_3_6.png?alt=media&token=1edacf8b-b3ca-4614-bb35-0d9ac9dd24e1)

    and RCE
    ![debug2_chainedtransformer_loop_3_7.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_3_7.png?alt=media&token=7a1810fd-2435-45b1-a9a1-7a362251699e)
    This time, it returns an instance of `Process` representing the process just created.

<br>

The final Transformer is a `ConstantTransformer`

- `i = 4`, `object` is an instance of `Process`(UNIXProcess):

  ![debug2_chainedtransformer_loop_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_4.png?alt=media&token=4f873af9-d0c0-427c-8a09-45d084c6e36a)

  `ConstantTransformer` returns a fixed value regardless of the input, so it returns 1 to end the Transformer chain, avoiding errors when no more actions are needed.
  ![debug2_chainedtransformer_loop_4_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_4_1.png?alt=media&token=ba116858-68eb-475f-a528-6908ad7da762)

Next, when `i = 5`, the loop has gone through the entire `iTransformers` array, it returns `object` carrying the value of the last `Transformer` returned, which is `1`.
![debug2_chainedtransformer_loop_4_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_chainedtransformer_loop_4_2.png?alt=media&token=4ca50171-2c90-4060-851f-60b44dea01f3)

At this point, back to `LazyMap`, `value` carries the value returned at the end of the Transformer chain, which is `1`, the key `"foo"` is added to the map (the `innerMap` object from the payload - a HashMap) and returns `value` (1).
![debug2_lazymap_putkey.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fdebug2_lazymap_putkey.png?alt=media&token=f520f95c-c7f7-4c51-81e4-35f58fd62628)

To TiedMapEntry, the 2 methods `getKey()` and `getValue` are done
![tiedmapentry_return.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Ftiedmapentry_return.png?alt=media&token=80b5b114-a387-4eba-aeee-e8f25e528cdb)
`getKey()` returns `"foo"`, `getValue()` returns `1` => `TiedMapEntry.toString()` returns `"foo=1"`

Next to `BadAttributeExpException`, now `val` will have the value `"foo=1"`
![val_value.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fval_value.png?alt=media&token=80e788af-71ab-47a8-98dd-e49c2b451894)

And finally back to `AuthController`, it returns the object that has been deserialized
![authcontroller_return.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fauthcontroller_return.png?alt=media&token=84205daf-e057-4785-8506-9d1b8947cdd3)
and continues the application.
![web_running.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Fweb_running.png?alt=media&token=5d2d2a31-2a27-4e69-a5c1-bd5f988de3cf)

On the web page, "Invalid Cookie" appears, but we have successfully exploited it.
![invalid_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F31a05a42-2dd2-48d4-85b4-f1291093e127%2Finvalid_cookie.png?alt=media&token=ff01b441-b544-412a-a2b5-de57893404e0)

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
